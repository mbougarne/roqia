#import "RoqiaSceneDelegate.h"
#import "AppDelegate.h"
#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>
#import <ReactAppDependencyProvider/RCTAppDependencyProvider.h>

@implementation RoqiaSceneDelegate

- (void)scene:(UIScene *)scene
    willConnectToSession:(UISceneSession *)session
                 options:(UISceneConnectionOptions *)connectionOptions {
  if (![scene isKindOfClass:UIWindowScene.class]) return;
  AppDelegate *delegate = (AppDelegate *)UIApplication.sharedApplication.delegate;
  NSMutableDictionary *options = [delegate.launchOptions mutableCopy];
  NSURL *url = connectionOptions.URLContexts.anyObject.URL;
  if (url) options[UIApplicationLaunchOptionsURLKey] = url;
  NSUserActivity *activity = connectionOptions.userActivities.anyObject;
  if (activity) {
    options[UIApplicationLaunchOptionsUserActivityDictionaryKey] = @{
      UIApplicationLaunchOptionsUserActivityTypeKey : activity.activityType,
      @"UIApplicationLaunchOptionsUserActivityKey" : activity
    };
  }
  self.dependencyProvider = [RCTAppDependencyProvider new];
  self.reactNativeFactory = [[RCTReactNativeFactory alloc] initWithDelegate:self];
  self.window = [[UIWindow alloc] initWithWindowScene:(UIWindowScene *)scene];
  [self.reactNativeFactory startReactNativeWithModuleName:@"roqia"
                                                 inWindow:self.window
                                            launchOptions:options];
}

- (void)scene:(UIScene *)scene openURLContexts:(NSSet<UIOpenURLContext *> *)URLContexts {
  for (UIOpenURLContext *context in URLContexts) {
    [RCTLinkingManager application:UIApplication.sharedApplication openURL:context.URL options:@{}];
  }
}

- (void)scene:(UIScene *)scene continueUserActivity:(NSUserActivity *)userActivity {
  [RCTLinkingManager application:UIApplication.sharedApplication
            continueUserActivity:userActivity
              restorationHandler:^(NSArray<id<UIUserActivityRestoring>> *restorableObjects){
              }];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge {
  return [self bundleURL];
}

- (NSURL *)bundleURL {
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
