#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE (RoqiaPrayer, RCTEventEmitter)
RCT_EXTERN_METHOD(locate : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(cancelLocation)
RCT_EXTERN_METHOD(startHeading : (double)latitude longitude : (double)longitude resolve : (
    RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(stopHeading)
RCT_EXTERN_METHOD(prepareBundledAdhan : (NSString *)resource bytes : (double)
                      bytes hash : (NSString *)hash resolve : (RCTPromiseResolveBlock)
                          resolve reject : (RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(previewAdhan : (NSString *)payload resolve : (RCTPromiseResolveBlock)
                      resolve reject : (RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(stopAdhan)
@end
