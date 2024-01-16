import jwt from "jsonwebtoken";

import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const verifyJWT = asyncHandler(async (request, response, next) => {
  try {
    const accessToken =
      request.cookies?.accessToken ||
      request.header("Authorization")?.replace("Bearer ", "");

    if (!accessToken) {
      return response
        .status(401)
        .json(new ApiError(401, "😰 Unauthorized request."));
    }

    const decodedToken = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      return response
        .status(401)
        .json(new ApiError(401, "😰 Invalid access token"));
    }

    request.user = user;
    next();
  } catch (error) {
    return response
      .status(401)
      .json(new ApiError(401, error?.message || "😰 Invalid access token"));
  }
});
