import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, 'something went wrong while generating refresh and access token')
    }
}

const registerUser = asyncHandler(async (req, res) => {
    //get user details from frontend
    //validation - not empty
    //check if user already exists: username,email
    //check for image and avatar
    //upload them to cloudinary, avatar
    //create user object - create entry in db
    //remove password and refresh token in field 
    //check for user creation
    //return res

    const { username, fullName, email, password } = req.body;
    console.log(username, fullName, email, password)

    if ([username, fullName, email, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required")
    }
    const existingUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existingUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    //const coverImgLocalPath = req.files?.coverImage[0]?.path
    let coverImgLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImgLocalPath = req.files?.coverImage[0]?.path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImg = await uploadOnCloudinary(coverImgLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImg?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered succesfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    //req body -> data
    //username or email
    //find the user
    //password check
    //generate refresh and access token
    //send cookie

    const { username, email, password } = req.body
    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }
    const existingUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (!existingUser) {
        throw new ApiError(404, "User not found , enter correct username or email")
    }
    const isPasswordCorrect = await existingUser.isPasswordCorrect(password)
    if (!isPasswordCorrect) {
        throw new ApiError(401, "Password is incorrect")
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(existingUser._id)

    const loggedInUser = await User.findById(existingUser._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true,
    }
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, { user: loggedInUser, refreshToken, accessToken }, "User Logged in successfully"))
})

const logoutUser = asyncHandler(async (req, res) => {
    const userId = req.user._id
    await User.findByIdAndUpdate(userId, { $set: { refreshToken: undefined } }, { new: true })
    const options = {
        httpOnly: true,
        secure: true,
    }
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User Logged out "))
})

const refreshAccessToken = asyncHandler(async (req,res)=>{
   const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
   if(!incomingRefreshToken){
    throw new ApiError(401,"unauthorized request")
   }
   try {
    const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
 
    const user = User.findById(decodedToken._id)
    if(!user){
     throw new ApiError(401, "invalid refresh token")
    }
    if(incomingRefreshToken!==user.refreshToken){
     throw new ApiError(401,"Refresh token is expired")
    }
    const options={
     httpOnly: true,
     secure: true
    }
    const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    return res
    .status(200)
    .cookie("accessToken",accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(new ApiResponse(200,{accessToken,refreshToken: newRefreshToken},"Access token refreshed"))
   } catch (error) {
        throw new ApiError(401,error?.message || "Invalid Refresh Token")
   }
})
export { registerUser, loginUser, logoutUser, refreshAccessToken }
