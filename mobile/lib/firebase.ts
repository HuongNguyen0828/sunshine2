import { initializeApp, getApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import Constants from 'expo-constants'

const cfg = (Constants.expoConfig?.extra as any)?.firebase
export const app = getApps().length ? getApp() : initializeApp(cfg)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
