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

  export enum EventType {
    UNKNOWN = -1,
    DISMISSED = 0,
    PRESS = 1,
    ACTION_PRESS = 2,
    DELIVERED = 3,
    APP_BLOCKED = 4,
    CHANNEL_BLOCKED = 5,
    CHANNEL_GROUP_BLOCKED = 6,
    TRIGGER_NOTIFICATION_CREATED = 7,
    FG_ALREADY_EXIST = 8,
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
    data?: Record<string, string | number | object>;
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

  export type Event = {
    type: EventType;
    detail: {
      notification?: Notification;
      pressAction?: {
        id: string;
      };
      input?: string;
    };
  };

  export type InitialNotification = {
    notification: Notification;
    pressAction: {
      id: string;
    };
    input?: string;
  };

  type NotifeeModule = {
    requestPermission: () => Promise<PermissionSettings>;
    createChannel: (channel: {
      id: string;
      name: string;
      importance?: AndroidImportance;
    }) => Promise<string>;
    displayNotification: (notification: Notification) => Promise<string>;
    cancelTriggerNotification: (id: string) => Promise<void>;
    createTriggerNotification: (
      notification: Notification,
      trigger: TimestampTrigger,
    ) => Promise<string>;
    onForegroundEvent: (observer: (event: Event) => void | Promise<void>) => () => void;
    onBackgroundEvent: (observer: (event: Event) => Promise<void>) => void;
    getInitialNotification: () => Promise<InitialNotification | null>;
  };

  const notifee: NotifeeModule;
  export default notifee;
}
