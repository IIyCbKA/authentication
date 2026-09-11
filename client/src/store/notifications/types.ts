/*
--------------NotificationID type--------------
*/
export type NotificationID = string;

/*
--------------NotificationInput type--------------
*/
export type NotificationInput = {
  message: string;
  autoHideDuration?: number;
};

/*
--------------NotificationData type--------------
*/
export type NotificationData = {
  id: NotificationID;
  message: string;
  autoHideDuration: number;
};

export type NotificationsState = {
  items: NotificationData[];
};
