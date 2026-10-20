#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE (RoqiaAudio, NSObject)
RCT_EXTERN_METHOD(audioDuration : (NSString *)path resolve : (RCTPromiseResolveBlock)
                      resolve reject : (RCTPromiseRejectBlock)reject)
@end
