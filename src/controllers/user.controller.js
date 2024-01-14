import jwt from "jsonwebtoken";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { validateEmail } from "../utils/validation.js";
import { SERVER_COOKIE_OPTION } from "../constants.js";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "😰 Something went wrong while generating tokens.");
  }
};

const registerUser = asyncHandler(async (request, response) => {
  const { username, email, fullName, password } = request.body;

  if ([username, email, fullName, password].some((field) => !field)) {
    throw new ApiError(400, "😰 All fields are required.");
  }

  if (!validateEmail(email)) {
    throw new ApiError(400, "😰 Email is not valid.");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(401, "😰 User with email and username already existed.");
  }

  let avatarLocalPath, coverImageLocalPath;

  if (
    request.files &&
    Array.isArray(request.files.avatar) &&
    request.files.avatar[0].path
  ) {
    avatarLocalPath = request.files?.avatar[0]?.path;
  }

  if (
    request.files &&
    Array.isArray(request.files.coverImage) &&
    request.files.coverImage[0].path
  ) {
    coverImageLocalPath = request.files?.coverImage[0]?.path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "😰 Avatar is required.");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "😰 Avatar is required.");
  }

  const user = await User.create({
    username,
    email,
    fullName,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url ?? "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(
      500,
      "😰 Something went wrong while registering the user."
    );
  }

  return response
    .status(201)
    .json(
      new ApiResponse(200, createdUser, "👍 User registered Successfully.")
    );
});

const loginUser = asyncHandler(async (request, response) => {
  const { email, username, password } = request.body;

  if (!(email || username)) {
    throw new ApiError(400, "😰 Email or username is required.");
  } else if (email && !validateEmail(email)) {
    throw new ApiError(400, "😰 Email is not valid.");
  } else if (!password) {
    throw new ApiError(400, "😰 Password is required.");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiError(404, "😰 User does not exist.");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "😰 password is not valid.");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user.id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  response
    .status(200)
    .cookie("accessToken", accessToken, SERVER_COOKIE_OPTION)
    .cookie("refreshToken", refreshToken, SERVER_COOKIE_OPTION)
    .json(
      new ApiResponse(
        200,
        { loggedInUser, accessToken, refreshToken },
        "👍 Logged in successfully."
      )
    );
});

const logoutUser = asyncHandler(async (request, response) => {
  await User.findByIdAndUpdate(
    request.user._id,
    {
      $unset: { refreshToken: 1 },
    },
    { new: true }
  );

  response
    .status(200)
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .json(new ApiResponse(200, {}, "👍 User logged out successfully."));
});

const refreshAccessToken = asyncHandler(async (request, response) => {
  try {
    const incomingRefreshToken =
      request.cookies?.refreshToken || request.body.refreshToken;

    if (!incomingRefreshToken) {
      throw new ApiError(401, "😰 Unauthorized request.");
    }

    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken._id);

    if (!user) {
      throw new ApiError(401, "😰 Invalid refresh token.");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "😰 Refresh token is expired.");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );

    return response
      .status(200)
      .cookie("accessToken", accessToken, SERVER_COOKIE_OPTION)
      .cookie("refreshToken", refreshToken, SERVER_COOKIE_OPTION)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "👍 Access token refreshed."
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "😰 Refresh token is expired.");
  }
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
