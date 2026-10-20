#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE (RoqiaPrayer, RCTEventEmitter)
RCT_EXTERN_METHOD(locate : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(cancelLocation)
RCT_EXTERN_METHOD(startHeading : (double)latitude longitude : (double)longitude resolve : (
    RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(stopHeading)
@end
