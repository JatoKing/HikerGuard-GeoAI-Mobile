import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * True when running inside the Expo Go app, which only ships Expo SDK's own
 * native modules — third-party native modules like MapLibre aren't present
 * and importing them crashes at module-load time. Dev/standalone builds
 * compile the native code in, so this is false there.
 */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;