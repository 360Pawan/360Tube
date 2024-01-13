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

  console.log("FILES", request.files);

  const avatarLocalPath = request.files?.avatar[0]?.path;
  const coverImageLocalPath = request.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "😰 Avatar is required.");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  console.log("avatar", avatar);

  if (!avatar) {
    throw new ApiError(400, "😰 Avatar is required.");
  }

  const user = await User.create({
    username,
    email,
    firstName,
    password,
    avatar: avatar.url,
    coverImage: coverImage.url ?? "",
  });

  console.log("USER", user);

  const createdUser = await User.findById(user._id).select(
    "-password refreshToken"
  );

  console.log("USER without cred", createdUser);

  if (!createdUser) {
    throw new ApiError(
      500,
      "😰 Something went wrong while registering the user."
    );
  }

  return response
    .status(201)
    .json(ApiResponse(200, createdUser, "👍 User registered Successfully."));
});

export { registerUser };
