import { Request, Response } from "express";
import mongoose, { isValidObjectId } from "mongoose";

import { Playlist } from "@/models/playlist.model";
import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";
import { asyncHandler } from "@/utils/asyncHandler";
import { User } from "@/models/user.model";
import { Video } from "@/models/video.model";

const createPlaylist = asyncHandler(
  async (request: Request, response: Response) => {
    const { name, description } = request.body;

    if (!name || !description) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 All fields required."));
    }

    const playlist = await Playlist.create({
      name,
      description,
      owner: request.user._id,
    });

    if (!playlist) {
      return response
        .status(500)
        .json(new ApiError(500, "😰 Error creating playlist."));
    }

    return response
      .status(201)
      .json(new ApiResponse(201, playlist, "👍 Playlist created."));
  }
);

const getUserPlaylists = asyncHandler(
  async (request: Request, response: Response) => {
    const { userId } = request.params;

    if (!userId || !isValidObjectId(userId)) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Not a valid user id."));
    }

    const user = await User.findById(userId);

    if (!user) {
      return response.status(404).json(new ApiError(404, "😰 No user found."));
    }

    const playLists = await Playlist.aggregate([
      {
        $match: {
          owner: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
          pipeline: [{ $project: { fullName: 1, username: 1, avatar: 1 } }],
        },
      },
      {
        $unwind: "$owner",
      },
    ]);

    return response
      .status(200)
      .json(
        new ApiResponse(200, playLists, "👍 Playlists fetched successfully.")
      );
  }
);

const getPlaylistById = asyncHandler(
  async (request: Request, response: Response) => {
    const { playlistId } = request.params;

    if (!playlistId || !isValidObjectId(playlistId)) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Not a valid playlist id."));
    }

    const playList = await Playlist.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(playlistId),
        },
      },
      {
        $lookup: {
          from: "videos",
          let: { videoIds: "$videos" },
          pipeline: [
            {
              $match: {
                $expr: { $in: ["$_id", "$$videoIds"] },
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                  { $project: { fullName: 1, username: 1, avatar: 1 } },
                ],
              },
            },
            { $unwind: "$owner" },
            {
              $project: {
                title: 1,
                description: 1,
                thumbnail: 1,
                views: 1,
                createdAt: 1,
                owner: 1,
              },
            },
          ],
          as: "videos",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
          pipeline: [{ $project: { fullName: 1, username: 1, avatar: 1 } }],
        },
      },
      {
        $unwind: "$owner",
      },
    ]);

    return response
      .status(200)
      .json(
        new ApiResponse(200, playList[0], "👍 Playlist fetched successfully.")
      );
  }
);

const addVideoToPlaylist = asyncHandler(
  async (request: Request, response: Response) => {
    const { playlistId, videoId } = request.params;

    if (!playlistId || !isValidObjectId(playlistId)) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Not a valid playlist id."));
    }

    if (!videoId || !isValidObjectId(videoId)) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Not a valid video id."));
    }

    const playList = await Playlist.findById(playlistId);

    if (!playList) {
      return response
        .status(404)
        .json(new ApiError(404, "😰 No playlist found."));
    }

    if (!playList.owner.equals(request.user._id)) {
      return response
        .status(401)
        .json(new ApiError(401, "😰 You cannot add video this playlist."));
    }

    const video = await Video.findById(videoId);

    if (!video) {
      return response.status(404).json(new ApiError(404, "😰 No video found."));
    }

    if (playList.videos.some((id) => id.equals(videoId))) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Video already inside playlist."));
    }

    playList.videos.push(video._id);
    const updatedPlaylist = await playList.save();

    if (!updatedPlaylist) {
      return response
        .status(500)
        .json(new ApiError(500, "😰 Error adding playlist."));
    }

    return response
      .status(200)
      .json(new ApiResponse(200, {}, "👍 Video added successfully."));
  }
);

const removeVideoFromPlaylist = asyncHandler(
  async (request: Request, response: Response) => {
    const { playlistId, videoId } = request.params;

    if (!playlistId || !isValidObjectId(playlistId)) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Not a valid playlist id."));
    }

    if (!videoId || !isValidObjectId(videoId)) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Not a valid video id."));
    }

    const playList = await Playlist.findById(playlistId);

    if (!playList) {
      return response
        .status(404)
        .json(new ApiError(404, "😰 No playlist found."));
    }

    if (!playList.owner.equals(request.user._id)) {
      return response
        .status(401)
        .json(
          new ApiError(401, "😰 You cannot remove video from this playlist.")
        );
    }

    const video = await Video.findById(videoId);

    if (!video) {
      return response.status(404).json(new ApiError(404, "😰 No video found."));
    }

    if (!playList.videos.some((id) => id.equals(videoId))) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Video is not inside playlist."));
    }

    const updatedList = playList.videos.filter((id) => !id.equals(videoId));

    playList.videos = updatedList;
    const updatedPlaylist = await playList.save();

    if (!updatedPlaylist) {
      return response
        .status(500)
        .json(new ApiError(500, "😰 Error removing playlist."));
    }

    return response
      .status(200)
      .json(new ApiResponse(200, {}, "👍 Video removed successfully."));
  }
);

const deletePlaylist = asyncHandler(
  async (request: Request, response: Response) => {
    const { playlistId } = request.params;

    if (!playlistId || !isValidObjectId(playlistId)) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Not a valid playlist id."));
    }

    const playList = await Playlist.findById(playlistId);

    if (!playList) {
      return response
        .status(404)
        .json(new ApiError(404, "😰 No playlist found."));
    }

    if (!playList.owner.equals(request.user._id)) {
      return response
        .status(401)
        .json(new ApiError(401, "😰 You cannot delete this playlist."));
    }

    const deletedPlaylist = await Playlist.deleteOne({ _id: playlistId });

    if (deletedPlaylist.deletedCount === 1) {
      return response
        .status(200)
        .json(new ApiResponse(200, {}, "👍 Playlist deleted successfully."));
    } else {
      return response
        .status(500)
        .json(new ApiError(500, "😰 Error deleting Playlist."));
    }
  }
);

const updatePlaylist = asyncHandler(
  async (request: Request, response: Response) => {
    const { playlistId } = request.params;
    const { name, description } = request.body;

    if (!playlistId || !isValidObjectId(playlistId)) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Not a valid playlist id."));
    }

    if (!name || !description) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 All fields required."));
    }

    const playList = await Playlist.findById(playlistId);

    if (!playList) {
      return response
        .status(404)
        .json(new ApiError(404, "😰 No playlist found."));
    }

    if (!playList.owner.equals(request.user._id)) {
      return response
        .status(401)
        .json(new ApiError(401, "😰 You cannot update this playlist."));
    }

    playList.name = name;
    playList.description = description;
    const updatedPlaylist = await playList.save();

    if (!updatedPlaylist) {
      return response
        .status(500)
        .json(new ApiError(500, "😰 Error updating playlist."));
    }

    return response
      .status(200)
      .json(new ApiResponse(200, {}, "👍 Playlist updated successfully."));
  }
);

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
