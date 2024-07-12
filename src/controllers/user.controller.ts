import mongoose from "mongoose";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, Response } from "express";

import { asyncHandler } from "@/utils/asyncHandler";
import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";
import { User } from "@/models/user.model";
import { validateEmail } from "@/utils/validation";
import { SERVER_COOKIE_OPTION } from "@/constants";
import { sendEmail } from "@/utils/sendEmail";
import { removeFromCloudinary, uploadOnCloudinary } from "@/utils/cloudinary";

const generateAccessAndRefreshToken = async (
  userId: string
): Promise<{ accessToken: string; refreshToken: string }> => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save();

    return { accessToken, refreshToken };
  } catch (error) {
    return Promise.reject(
      new ApiError(500, "😰 Something went wrong while generating tokens.")
    );
  }
};

const verifyEmailToken = async (
  emailToken: string
): Promise<{ decodedToken: JwtPayload & { _id: mongoose.Types.ObjectId } }> => {
  try {
    const decodedToken = jwt.verify(
      emailToken,
      process.env.EMAIL_TOKEN_SECRET
    ) as JwtPayload & { _id: mongoose.Types.ObjectId };

    if (typeof decodedToken !== "object" || !decodedToken._id) {
      throw new ApiError(401, "😰 Token is expired or invalid.");
    }

    return { decodedToken };
  } catch (error) {
    throw new ApiError(401, error?.message || "😰 Invalid email token");
  }
};

const registerUser = asyncHandler(
  async (request: Request, response: Response) => {
    const { username, email, fullName, password } = request.body;

    if ([username, email, fullName, password].some((field) => !field)) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 All fields are required."));
    }

    if (!validateEmail(email)) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Email is not valid."));
    }

    const existedUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existedUser) {
      return response
        .status(401)
        .json(
          new ApiError(401, "😰 User with email and username already existed.")
        );
    }

    let avatarLocalPath: string, coverImageLocalPath: string;

    if (
      request.files &&
      Array.isArray(request.files.avatar) &&
      request.files.avatar[0].path
    ) {
      avatarLocalPath = request.files?.avatar[0]?.path;
    } else {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Avatar is required."));
    }

    if (
      request.files &&
      Array.isArray(request.files.coverImage) &&
      request.files.coverImage[0].path
    ) {
      coverImageLocalPath = request.files?.coverImage[0]?.path;
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath, "/users/avatars");
    const coverImage = await uploadOnCloudinary(
      coverImageLocalPath,
      "/users/coverImages"
    );

    if (!avatar?.url) {
      return response
        .status(500)
        .json(new ApiError(500, "😰 Error uploading avatar."));
    }

    const user = await User.create({
      username,
      email,
      fullName,
      password,
      avatar: { url: avatar.url, publicId: avatar.public_id },
      coverImage: {
        url: coverImage?.url ?? "",
        publicId: coverImage?.public_id ?? "",
      },
    });

    const createdUser = await User.findById(user._id).select("-password");

    if (!createdUser) {
      return response
        .status(500)
        .json(
          new ApiError(
            500,
            "😰 Something went wrong while registering the user."
          )
        );
    }

    const emailToken = user.generateEmailToken();
    user.emailToken = emailToken;
    await user.save();

    sendEmail({
      subject: "Verify Email",
      to: user.email,
      from: process.env.GOOGLE_EMAIL,
      html: `<p>Hey ${user.fullName}</p>
            <p>🌻 Verify your email to continue using our services <a href="https://www.360Tube.com?token=${user.emailToken}">Verify Email</a>🌻</p>
            <p>${user.emailToken}</p>
            <p>Thank you</p>`,
    });

    return response
      .status(201)
      .json(
        new ApiResponse(201, createdUser, "👍 User registered Successfully.")
      );
  }
);

const confirmEmail = asyncHandler(
  async (request: Request, response: Response) => {
    const { emailToken } = request.query;

    if (!emailToken || typeof emailToken !== "string") {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Email token is needed."));
    }

    const { decodedToken } = await verifyEmailToken(emailToken);

    const user = await User.findById(
      decodedToken._id as mongoose.Types.ObjectId
    );

    if (!user) {
      return response
        .status(401)
        .json(new ApiError(401, "😰 Token is expired or invalid."));
    }

    if (user.isVerifiedEmail) {
      return response
        .status(400)
        .json(new ApiError(401, "😰 Email is already verified."));
    }

    if (emailToken !== user.emailToken) {
      response
        .status(401)
        .json(new ApiError(401, "😰 Email token is expired."));
    }

    user.isVerifiedEmail = true;
    user.emailToken = "";
    await user.save();

    return response
      .status(201)
      .json(new ApiResponse(200, {}, "👍 User email verified Successfully."));
  }
);

// TODO Create a handler to handle forgot password

const resetPassword = asyncHandler(
  async (request: Request, response: Response) => {
    const { email } = request.query;

    if (!email) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Email is needed."));
    }

    if (email && !validateEmail(email)) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Email is not valid."));
    }

    const user = User.findOne({ email: email });

    if (!user) {
      return response.status(404).json(new ApiError(404, "😰 No user found."));
    }
  }
);

const loginUser = asyncHandler(async (request: Request, response: Response) => {
  const { email, username, password } = request.body;

  if (!(email || username)) {
    return response
      .status(400)
      .json(new ApiError(400, "😰 Email or username is required."));
  } else if (email && !validateEmail(email)) {
    return response
      .status(400)
      .json(new ApiError(400, "😰 Email is not valid."));
  } else if (!password) {
    return response
      .status(400)
      .json(new ApiError(400, "😰 Password is required."));
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    return response
      .status(404)
      .json(new ApiError(404, "😰 User does not exist."));
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    return response
      .status(401)
      .json(new ApiError(401, "😰 password is not valid."));
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

const logoutUser = asyncHandler(
  async (request: Request, response: Response) => {
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
  }
);

const refreshAccessToken = asyncHandler(
  async (request: Request, response: Response) => {
    try {
      const incomingRefreshToken =
        request.cookies?.refreshToken || request.body.refreshToken;

      if (!incomingRefreshToken) {
        return response
          .status(401)
          .json(new ApiError(401, "😰 Unauthorized request."));
      }

      const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
      ) as JwtPayload & { _id: mongoose.Types.ObjectId };

      if (typeof decodedToken !== "object" || !decodedToken._id) {
        return response
          .status(401)
          .json(new ApiError(401, "😰 Invalid refresh token."));
      }

      const user = await User.findById(
        decodedToken._id as mongoose.Types.ObjectId
      );

      if (!user) {
        return response
          .status(401)
          .json(new ApiError(401, "😰 Invalid refresh token."));
      }

      if (incomingRefreshToken !== user.refreshToken) {
        response
          .status(401)
          .json(new ApiError(401, "😰 Refresh token is expired."));
      }

      const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
        user._id as string
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
      return response
        .status(401)
        .json(
          new ApiError(401, error?.message || "😰 Refresh token is expired.")
        );
    }
  }
);

const changePassword = asyncHandler(
  async (request: Request, response: Response) => {
    const { oldPassword, newPassword } = request.body;

    if (!oldPassword || !newPassword) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 All fields required."));
    }

    const user = await User.findById(request.user._id);
    const isPasswordValid = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordValid) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Old password is not correct."));
    }

    user.password = newPassword;
    await user.save();

    return response
      .status(200)
      .json(new ApiResponse(200, {}, "👍 Password updated successfully."));
  }
);

const getCurrentUser = asyncHandler(
  async (request: Request, response: Response) => {
    response
      .status(200)
      .json(
        new ApiResponse(
          200,
          request.user,
          "👍 User details fetched successfully."
        )
      );
  }
);

const updateAccountDetails = asyncHandler(
  async (request: Request, response: Response) => {
    const { email, fullName } = request.body;

    if (!email || !fullName) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 All fields required."));
    }

    if (email && !validateEmail(email)) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Email is not valid."));
    }

    const user = await User.findByIdAndUpdate(
      request.user._id,
      {
        $set: {
          fullName,
          email,
        },
      },
      { new: true }
    ).select("-password -refreshToken");

    return response
      .status(200)
      .json(new ApiResponse(200, user, "👍 User details updated."));
  }
);

const updateUserAvatar = asyncHandler(
  async (request: Request, response: Response) => {
    let avatarLocalPath: string;

    if (request.file && request.file.path) {
      avatarLocalPath = request.file.path;
    } else {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Avatar is required."));
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath, "/users/avatars");

    if (!avatar.url) {
      return response
        .status(500)
        .json(new ApiError(500, "😰 Error while uploading avatar."));
    }

    if (request.user.avatar.publicId) {
      await removeFromCloudinary(request.user.avatar.publicId, "image");
    }

    const user = await User.findByIdAndUpdate(
      request.user._id,
      {
        $set: {
          avatar: { url: avatar.url, publicId: avatar.public_id },
        },
      },
      { new: true }
    ).select("-password -refreshToken");

    return response
      .status(200)
      .json(new ApiResponse(200, user, "👍 Avatar updated."));
  }
);

const updateUserCoverImage = asyncHandler(
  async (request: Request, response: Response) => {
    let coverImageLocalPath: string;

    if (request.file && request.file.path) {
      coverImageLocalPath = request.file.path;
    } else {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Cover image is required."));
    }

    const coverImage = await uploadOnCloudinary(
      coverImageLocalPath,
      "/users/coverImages"
    );

    if (!coverImage.url) {
      return response
        .status(500)
        .json(new ApiError(500, "😰 Error while uploading cover image."));
    }

    if (request.user.coverImage.publicId) {
      await removeFromCloudinary(request.user.coverImage.publicId, "image");
    }

    const user = await User.findByIdAndUpdate(
      request.user._id,
      {
        $set: {
          coverImage: {
            url: coverImage.url,
            publicId: coverImage.public_id,
          },
        },
      },
      { new: true }
    ).select("-password -refreshToken");

    return response
      .status(200)
      .json(new ApiResponse(200, user, "👍 Cover image updated."));
  }
);

const getUserChannelProfile = asyncHandler(
  async (request: Request, response: Response) => {
    const { username } = request.params;

    if (!username?.trim()) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Username is missing."));
    }

    const channel = await User.aggregate([
      {
        $match: {
          username: username.toLowerCase(),
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "channel",
          as: "subscribers",
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "subscriber",
          as: "subscribedTo",
        },
      },
      {
        $addFields: {
          subscriberCount: {
            $size: "$subscribers",
          },
          channelsSubscribedToCount: {
            $size: "$subscribedTo",
          },
          isSubscribed: {
            $cond: {
              if: { $in: [request.user?.id, "$subscribers.subscribe"] },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $project: {
          fullName: 1,
          username: 1,
          email: 1,
          avatar: 1,
          coverImage: 1,
          subscriberCount: 1,
          channelsSubscribedToCount: 1,
          isSubscribed: 1,
        },
      },
    ]);

    if (!channel?.length) {
      return response
        .status(404)
        .json(new ApiError(404, "😰 Channel does not exists"));
    }

    response
      .status(200)
      .json(
        new ApiResponse(200, channel[0], "👍 User channel fetched successfully")
      );
  }
);

const getUserHistory = asyncHandler(
  async (request: Request, response: Response) => {
    const user = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(request.user.id),
        },
      },
      {
        $lookup: {
          from: "videos",
          localField: "watchHistory",
          foreignField: "_id",
          as: "watchHistory",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                  {
                    $project: {
                      fullName: 1,
                      username: 1,
                      email: 1,
                    },
                  },
                ],
              },
            },
            {
              $addFields: {
                owner: { $first: "$owner" },
              },
            },
          ],
        },
      },
    ]);

    return response
      .status(200)
      .json(
        new ApiResponse(
          200,
          user[0].watchHistory,
          "👍 Watch history fetched successfully."
        )
      );
  }
);

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getUserHistory,
  confirmEmail,
  resetPassword,
};
