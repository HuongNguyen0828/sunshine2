import { initializeApp, getApp, getApps } from 'firebase/app'
import { getAuth, initializeAuth, type Auth } from 'firebase/auth'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import Constants from 'expo-constants'

import { getReactNativePersistence } from '@firebase/auth/dist/rn/index.js'

const cfg = (Constants.expoConfig?.extra as any)?.firebase
export const app = getApps().length ? getApp() : initializeApp(cfg)

export const auth: Auth =
  Platform.OS === 'web'
    ? getAuth(app)
    : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })

export const db = getFirestore(app)
export const storage = getStorage(app)
