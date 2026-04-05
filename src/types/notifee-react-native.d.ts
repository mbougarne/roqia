declare module '@notifee/react-native' {
  export enum AuthorizationStatus {
    DENIED = 0,
    AUTHORIZED = 1,
    PROVISIONAL = 2,
  }

  export enum AndroidImportance {
    DEFAULT = 3,
    HIGH = 4,
  }

  export enum RepeatFrequency {
    DAILY = 1,
  }

  export enum TriggerType {
    TIMESTAMP = 0,
  }

  export type TimestampTrigger = {
    type: TriggerType.TIMESTAMP;
    timestamp: number;
    repeatFrequency?: RepeatFrequency;
  };

  type PermissionSettings = {
    authorizationStatus: AuthorizationStatus;
  };

  type Notification = {
    id?: string;
    title?: string;
    body?: string;
    android?: {
      channelId: string;
      pressAction?: {
        id: string;
      };
    };
    ios?: {
      sound?: string;
    };
  };

  type NotifeeModule = {
    requestPermission: () => Promise<PermissionSettings>;
    createChannel: (channel: {
      id: string;
      name: string;
      importance?: AndroidImportance;
    }) => Promise<string>;
    cancelTriggerNotification: (id: string) => Promise<void>;
    createTriggerNotification: (
      notification: Notification,
      trigger: TimestampTrigger,
    ) => Promise<string>;
  };

  const notifee: NotifeeModule;
  export default notifee;
}
