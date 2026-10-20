#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE (RoqiaReader, NSObject)
RCT_EXTERN_METHOD(keepAwake : (BOOL)enabled)
RCT_EXTERN_METHOD(extractSource : (NSString *)path size : (NSInteger)size hash : (NSString *)
                      hash members : (NSArray *)members resolve : (RCTPromiseResolveBlock)
                          resolve reject : (RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(sourceOpenings : (NSString *)path size : (NSInteger)size hash : (NSString *)
                      hash resolve : (RCTPromiseResolveBlock)
                          resolve reject : (RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(loadFont : (NSString *)path expectedHash : (NSString *)
                      expectedHash verses : (NSArray *)verses resolve : (RCTPromiseResolveBlock)
                          resolve reject : (RCTPromiseRejectBlock)reject)
@end
