#import <RCTDefaultReactNativeFactoryDelegate.h>
#import <RCTReactNativeFactory.h>
#import <UIKit/UIKit.h>

@interface RoqiaSceneDelegate : RCTDefaultReactNativeFactoryDelegate <UIWindowSceneDelegate>
@property(nonatomic, strong) UIWindow *window;
@property(nonatomic, strong) RCTReactNativeFactory *reactNativeFactory;
@end
