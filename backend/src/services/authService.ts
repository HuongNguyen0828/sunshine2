import admin from 'firebase-admin';
import { UserRole, UserClaims } from '../models/user';

export class AuthService {
  // Set custom claims for a user
  async setUserRole(uid: string, role: UserRole, daycareId?: string): Promise<void> {
    const claims: UserClaims = { role };
    
    if (daycareId) {
      claims.daycareId = daycareId;
    }
    
    // Additional logic based on role
    if (role === UserRole.Teacher && !daycareId) {
        throw new Error('daycareId is required for teacher role');
    }
    
    try {
      await admin.auth().setCustomUserClaims(uid, claims);
      console.log(`Successfully set ${role} role for user ${uid}`);
    } catch (error) {
      console.error('Error setting custom claims:', error);
      throw new Error('Failed to set user role');
    }
  }

  // Get user role from claims
  async getUserRole(uid: string): Promise<UserRole | null> {
    try {
      const user = await admin.auth().getUser(uid);
      // return user roles
      return user.customClaims?.role as UserRole || null;
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  }

  // Check if user has a specific role
  async hasRole(uid: string, role: UserRole): Promise<boolean | null> {
    const userRole = await this.getUserRole(uid);
    if (userRole === null) {
        throw new Error('User not found or has no role assigned');
    }
    return userRole === role;
    }

}
