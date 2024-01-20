import { Request, Response } from "express";
import mongoose, { isValidObjectId } from "mongoose";

import { Comment } from "@/models/comment.model";
import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";
import { asyncHandler } from "@/utils/asyncHandler";
import { Video } from "@/models/video.model";

const getVideoComments = asyncHandler(
  async (request: Request, response: Response) => {
    const { videoId } = request.params;
    const { page = 1, limit = 10 } = request.query;

    if (!videoId || !isValidObjectId(videoId)) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Not a valid video id."));
    }

    const video = await Video.findById(videoId);

    if (!video) {
      return response.status(404).json(new ApiError(404, "😰 No video found"));
    }

    const comments = await Comment.aggregate([
      {
        $match: {
          video: new mongoose.Types.ObjectId(videoId),
        },
      },
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
                avatar: 1,
              },
            },
          ],
        },
      },
      { $unwind: "$owner" },
      {
        $project: {
          video: 0,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      { $skip: (parseInt(page as string) - 1) * parseInt(limit as string) },
      { $limit: parseInt(limit as string) },
    ]);

    return response
      .status(200)
      .json(
        new ApiResponse(200, comments, "👍 Comments fetched successfully.")
      );
  }
);

const addComment = asyncHandler(
  async (request: Request, response: Response) => {
    const { videoId } = request.params;
    const { content } = request.body;

    if (!videoId || !isValidObjectId(videoId)) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Not a valid video id."));
    }

    if (!content) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Content is required."));
    }

    const video = await Video.findById(videoId);

    if (!video) {
      return response.status(404).json(new ApiError(404, "😰 No video found"));
    }

    const comment = await Comment.create({
      owner: request.user._id,
      video: video._id,
      content,
    });

    if (!comment) {
      return response
        .status(500)
        .json(
          new ApiError(500, "😰 Something went wrong while adding comment.")
        );
    }

    return response
      .status(201)
      .json(new ApiResponse(201, comment, "👍 Comment added successfully."));
  }
);

const updateComment = asyncHandler(
  async (request: Request, response: Response) => {
    const { commentId } = request.params;
    const { content } = request.body;

    if (!commentId || !isValidObjectId(commentId)) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Not a valid comment id."));
    }

    if (!content) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Content is required."));
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return response
        .status(404)
        .json(new ApiError(404, "😰 No comment found."));
    }

    if (!comment.owner.equals(request.user._id)) {
      return response
        .status(401)
        .json(new ApiError(401, "😰 You cannot update this comment."));
    }

    comment.content = content;
    const updatedComment = await comment.save();

    if (!updatedComment) {
      return response
        .status(500)
        .json(
          new ApiError(500, "😰 Something went wrong while updating comment.")
        );
    }

    return response
      .status(200)
      .json(
        new ApiResponse(200, updatedComment, "👍 Comment updated successfully.")
      );
  }
);

const deleteComment = asyncHandler(
  async (request: Request, response: Response) => {
    const { commentId } = request.params;

    if (!commentId || !isValidObjectId(commentId)) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Not a valid comment id."));
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return response
        .status(404)
        .json(new ApiError(404, "😰 No comment found"));
    }

    if (!comment.owner.equals(request.user._id)) {
      return response
        .status(401)
        .json(new ApiError(401, "😰 You cannot delete this comment."));
    }

    const deletedComment = await Comment.deleteOne({ _id: commentId });

    if (deletedComment.deletedCount === 1) {
      return response
        .status(200)
        .json(new ApiResponse(200, {}, "👍 Comment deleted."));
    } else {
      return response
        .status(500)
        .json(new ApiError(500, "😰 Error deleting comment."));
    }
  }
);

export { getVideoComments, addComment, updateComment, deleteComment };
