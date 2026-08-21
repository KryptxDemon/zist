import { apiClient } from "./apiClient";
import type {
  FriendListResponse,
  FriendRelationship,
  FriendRequest,
  FriendRequestListResponse,
} from "@/types";

/**
 * Frontend service for the friend-request system.
 *
 * Mirrors the backend endpoints in `app/api/api_v1/endpoints/friends.py`.
 * Errors surface as `ApiError` instances with `status` and `data` fields —
 * callers should handle 4xx responses locally (e.g. "request already pending").
 */

export const friendService = {
  /**
   * Send a friend request to another user.
   */
  async sendRequest(recipientId: string): Promise<FriendRequest> {
    return apiClient.post<FriendRequest>("/friends/requests", {
      recipient_id: recipientId,
    });
  },

  /**
   * Cancel a pending friend request you previously sent.
   */
  async cancelRequest(requestId: string): Promise<FriendRequest> {
    return apiClient.post<FriendRequest>(
      `/friends/requests/${requestId}/cancel`,
    );
  },

  /**
   * Accept an incoming friend request.
   */
  async acceptRequest(requestId: string): Promise<FriendRequest> {
    return apiClient.post<FriendRequest>(
      `/friends/requests/${requestId}/accept`,
    );
  },

  /**
   * Decline an incoming friend request.
   */
  async declineRequest(requestId: string): Promise<FriendRequest> {
    return apiClient.post<FriendRequest>(
      `/friends/requests/${requestId}/decline`,
    );
  },

  /**
   * List every pending friend request (incoming + outgoing).
   */
  async listRequests(): Promise<FriendRequestListResponse> {
    return apiClient.get<FriendRequestListResponse>("/friends/requests");
  },

  /**
   * List pending requests targeted at me.
   */
  async listIncoming(): Promise<FriendRequestListResponse> {
    return apiClient.get<FriendRequestListResponse>(
      "/friends/requests/incoming",
    );
  },

  /**
   * List pending requests I have sent to others.
   */
  async listOutgoing(): Promise<FriendRequestListResponse> {
    return apiClient.get<FriendRequestListResponse>(
      "/friends/requests/outgoing",
    );
  },

  /**
   * List every user I am mutual friends with.
   */
  async listFriends(): Promise<FriendListResponse> {
    return apiClient.get<FriendListResponse>("/friends");
  },

  /**
   * Describe the relationship between the current user and another user.
   */
  async getRelationship(userId: string): Promise<FriendRelationship> {
    return apiClient.get<FriendRelationship>(
      `/friends/relationship/${userId}`,
    );
  },

  /**
   * Remove an existing friendship (in either direction).
   */
  async unfriend(userId: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/friends/${userId}`);
  },
};