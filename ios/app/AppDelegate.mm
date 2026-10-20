#import "AppDelegate.h"
#import <RNBackgroundDownloader.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application
    didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
  self.launchOptions = launchOptions ?: @{};
  return YES;
}

- (void)application:(UIApplication *)application
    handleEventsForBackgroundURLSession:(NSString *)identifier
                      completionHandler:(void (^)(void))completionHandler {
  [RNBackgroundDownloader setCompletionHandlerWithIdentifier:identifier
                                           completionHandler:completionHandler];
}

@end
