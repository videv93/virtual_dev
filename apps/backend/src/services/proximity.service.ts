import { User, Position, PROXIMITY_RADIUS, ProximityPayload } from '@virtual-dev/shared';

interface ProximityState {
  [userId: string]: Set<string>; // userId -> Set of nearby user IDs
}

export class ProximityService {
  private proximityState: ProximityState = {};

  /**
   * Calculate Euclidean distance between two positions
   */
  private calculateDistance(pos1: Position, pos2: Position): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Check if two users are within proximity radius
   */
  private isInProximity(user1: User, user2: User): boolean {
    const distance = this.calculateDistance(user1.position, user2.position);
    return distance <= PROXIMITY_RADIUS;
  }

  /**
   * Get all users within proximity of the given user
   */
  getNearbyUsers(user: User, allUsers: User[]): User[] {
    return allUsers.filter((otherUser) => {
      if (otherUser.id === user.id) return false;
      return this.isInProximity(user, otherUser);
    });
  }

  /**
   * Update proximity state for a user and return enter/exit events
   * Returns { entered: User[], exited: string[] }
   */
  updateProximity(
    user: User,
    allUsers: User[]
  ): { entered: User[]; exited: string[] } {
    const userId = user.id;

    // Get current nearby users
    const nearbyUsers = this.getNearbyUsers(user, allUsers);
    const nearbyUserIds = new Set(nearbyUsers.map((u) => u.id));

    // Get previous proximity state
    const previousNearbyIds = this.proximityState[userId] || new Set<string>();

    // Calculate who entered proximity (new nearby users)
    const entered = nearbyUsers.filter(
      (u) => !previousNearbyIds.has(u.id)
    );

    // Calculate who exited proximity (previously nearby but not anymore)
    const exited = Array.from(previousNearbyIds).filter(
      (id) => !nearbyUserIds.has(id)
    );

    // Update proximity state
    this.proximityState[userId] = nearbyUserIds;

    return { entered, exited };
  }

  /**
   * Remove user from proximity tracking
   */
  removeUser(userId: string): void {
    delete this.proximityState[userId];

    // Remove this user from all other users' proximity lists
    Object.keys(this.proximityState).forEach((otherUserId) => {
      this.proximityState[otherUserId].delete(userId);
    });
  }

  /**
   * Get all users currently near the given user
   */
  getCurrentlyNearby(userId: string): string[] {
    return Array.from(this.proximityState[userId] || new Set<string>());
  }

  /**
   * Clear all proximity state (useful for testing)
   */
  clearAll(): void {
    this.proximityState = {};
  }
}

export const proximityService = new ProximityService();
