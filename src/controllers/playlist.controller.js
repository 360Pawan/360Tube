import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (request, response) => {
  const { name, description } = request.body;

  //TODO: create playlist
});

const getUserPlaylists = asyncHandler(async (request, response) => {
  const { userId } = request.params;
  //TODO: get user playlists
});

const getPlaylistById = asyncHandler(async (request, response) => {
  const { playlistId } = request.params;
  //TODO: get playlist by id
});

const addVideoToPlaylist = asyncHandler(async (request, response) => {
  const { playlistId, videoId } = request.params;
});

const removeVideoFromPlaylist = asyncHandler(async (request, response) => {
  const { playlistId, videoId } = request.params;
  // TODO: remove video from playlist
});

const deletePlaylist = asyncHandler(async (request, response) => {
  const { playlistId } = request.params;
  // TODO: delete playlist
});

const updatePlaylist = asyncHandler(async (request, response) => {
  const { playlistId } = request.params;
  const { name, description } = request.body;
  //TODO: update playlist
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
