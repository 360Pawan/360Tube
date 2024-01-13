import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHandler(async (request, response) => {
  const { username, email, fullName, password } = request.body;

  if (
    [username, email, fullName, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "😰 All fields are required.");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(401, "😰 User with email and username already existed.");
  }

  const avatarLocalPath = request.files?.avatar[0]?.path;
  let coverImageLocalPath;

  if (!avatarLocalPath) {
    throw new ApiError(400, "😰 Avatar is required.");
  }

  if (
    request.files &&
    Array.isArray(request.files.coverImage) &&
    request.files.coverImage[0].path
  ) {
    coverImageLocalPath = request.files?.coverImage[0]?.path;
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

export { registerUser };
