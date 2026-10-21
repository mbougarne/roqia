#import <Foundation/Foundation.h>
#import <AVFoundation/AVFoundation.h>
#import <React/RCTBridgeModule.h>
#import <XCTest/XCTest.h>

// Exercise the exported adapter exactly as JavaScript calls it, against the real bundled source.
@interface NSObject (RoqiaReaderTests)
- (void)audioDuration:(NSString *)path
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject;
- (void)verseAudio:(NSString *)path
      expectedHash:(NSString *)expectedHash
           startMs:(double)startMs
             endMs:(double)endMs
           resolve:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject;
- (void)extractSource:(NSString *)path
                 size:(NSInteger)size
                 hash:(NSString *)hash
              members:(NSArray *)members
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject;
- (void)sourceOpenings:(NSString *)path
                  size:(NSInteger)size
                  hash:(NSString *)hash
               resolve:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject;
- (void)loadFont:(NSString *)path
    expectedHash:(NSString *)expectedHash
          verses:(NSArray *)verses
         resolve:(RCTPromiseResolveBlock)resolve
          reject:(RCTPromiseRejectBlock)reject;
@end

@interface appTests : XCTestCase
@property(nonatomic, strong) NSURL *directory;
@property(nonatomic, strong) NSDictionary *pack;
@property(nonatomic, strong) NSObject *reader;
@end

@implementation appTests

- (void)setUp {
  [super setUp];
  NSURL *documents = [NSFileManager.defaultManager URLsForDirectory:NSDocumentDirectory
                                                          inDomains:NSUserDomainMask]
                         .firstObject;
  self.directory =
      [documents URLByAppendingPathComponent:[@"roqia/native-tests-"
                                                 stringByAppendingString:NSUUID.UUID.UUIDString]];
  NSError *error;
  XCTAssertTrue([NSFileManager.defaultManager createDirectoryAtURL:self.directory
                                       withIntermediateDirectories:YES
                                                        attributes:nil
                                                             error:&error]);
  NSURL *catalog = [[NSBundle bundleForClass:self.class] URLForResource:@"catalog.data"
                                                          withExtension:@"json"];
  NSDictionary *data =
      [NSJSONSerialization JSONObjectWithData:[NSData dataWithContentsOfURL:catalog]
                                      options:0
                                        error:&error];
  self.pack = data[@"texts"][0][@"pack"];
  self.reader = [NSClassFromString(@"RoqiaReader") new];
  XCTAssertNotNil(self.reader);
  XCTAssertNotNil(self.pack);
}

- (void)tearDown {
  [NSFileManager.defaultManager removeItemAtURL:self.directory error:nil];
  [super tearDown];
}

- (NSDictionary *)asset:(NSString *)assetId {
  for (NSDictionary *asset in
       [self.pack[@"assets"] arrayByAddingObjectsFromArray:self.pack[@"derivedAssets"]])
    if ([asset[@"id"] isEqual:assetId]) return asset;
  XCTFail(@"Missing fixture asset %@", assetId);
  return nil;
}

- (NSString *)path:(NSString *)assetId {
  return [self.directory URLByAppendingPathComponent:[self asset:assetId][@"file"]].path;
}

- (void)copySource {
  NSURL *source = [NSBundle.mainBundle.bundleURL
      URLByAppendingPathComponent:@"roqia-offline/quran-warsh/source-1/original.zip"];
  XCTAssertTrue([NSFileManager.defaultManager copyItemAtPath:source.path
                                                      toPath:[self path:@"original"]
                                                       error:nil]);
}

- (void)importSource {
  [self copySource];
  NSMutableArray *members = [NSMutableArray new];
  for (NSDictionary *member in self.pack[@"preparation"][@"archiveMembers"]) {
    NSDictionary *asset = [self asset:member[@"assetId"]];
    [members addObject:@{
      @"entry" : member[@"entry"],
      @"path" : [self path:member[@"assetId"]],
      @"bytes" : asset[@"bytes"],
      @"sha256" : asset[@"sha256"]
    }];
  }
  NSDictionary *source = [self asset:@"original"];
  __block BOOL resolved = NO;
  [self.reader extractSource:[self path:@"original"]
      size:[source[@"bytes"] integerValue]
      hash:source[@"sha256"]
      members:members
      resolve:^(id value) {
        resolved = YES;
      }
      reject:^(NSString *code, NSString *message, NSError *error) {
        XCTFail(@"%@ %@", code, message);
      }];
  XCTAssertTrue(resolved);
}

- (void)testRealWarshSourceOpeningsAndFontCoverage {
  [self importSource];
  NSDictionary *document = [self asset:@"source-document"];
  __block NSDictionary *openings;
  [self.reader sourceOpenings:[self path:@"source-document"]
      size:[document[@"bytes"] integerValue]
      hash:document[@"sha256"]
      resolve:^(id value) {
        openings = value;
      }
      reject:^(NSString *code, NSString *message, NSError *error) {
        XCTFail(@"%@ %@", code, message);
      }];
  XCTAssertEqual(openings.count, 113);
  XCTAssertNil(openings[@"9"]);
  NSArray *rows = [NSJSONSerialization
      JSONObjectWithData:[NSData dataWithContentsOfFile:[self path:@"source-data"]]
                 options:0
                   error:nil];
  XCTAssertEqual(rows.count, 6214);
  for (NSInteger surah = 1; surah <= 114; surah++) {
    NSMutableArray *verses = [NSMutableArray new];
    NSString *opening = openings[[NSString stringWithFormat:@"%ld", (long)surah]];
    if (opening) [verses addObject:opening];
    for (NSDictionary *row in rows)
      if ([row[@"sura_no"] integerValue] == surah) [verses addObject:row[@"aya_text"]];
    __block NSString *fontName;
    [self.reader loadFont:[self path:@"source-font"]
        expectedHash:[self asset:@"source-font"][@"sha256"]
        verses:verses
        resolve:^(id value) {
          fontName = value;
        }
        reject:^(NSString *code, NSString *message, NSError *error) {
          XCTFail(@"Surah %ld: %@ %@", (long)surah, code, message);
        }];
    XCTAssertGreaterThan(fontName.length, 0);
  }
}

- (void)testAudioDurationReadsTheBundledRecording {
  NSURL *source = [[NSBundle bundleForClass:self.class] URLForResource:@"roqia-01"
                                                         withExtension:@"mp3"];
  NSURL *target = [self.directory URLByAppendingPathComponent:@"recording.mp3"];
  XCTAssertTrue([NSFileManager.defaultManager copyItemAtURL:source toURL:target error:nil]);
  NSObject *audio = [NSClassFromString(@"RoqiaAudio") new];
  XCTAssertNotNil(audio);
  XCTestExpectation *duration = [self expectationWithDescription:@"Read native audio duration"];
  duration.assertForOverFulfill = NO;
  [audio audioDuration:target.path
      resolve:^(NSNumber *milliseconds) {
        XCTAssertGreaterThan(milliseconds.doubleValue, 4000);
        XCTAssertLessThan(milliseconds.doubleValue, 10000);
        [duration fulfill];
      }
      reject:^(NSString *code, NSString *message, NSError *error) {
        XCTFail(@"%@ %@", code, message);
        [duration fulfill];
      }];
  [self waitForExpectations:@[ duration ] timeout:10];
}

- (void)testNativeVerseClipIsBoundedAndReusable {
  NSURL *source = [[NSBundle bundleForClass:self.class] URLForResource:@"roqia-01"
                                                         withExtension:@"mp3"];
  NSURL *target = [self.directory URLByAppendingPathComponent:@"clip-source.mp3"];
  XCTAssertTrue([NSFileManager.defaultManager copyItemAtURL:source toURL:target error:nil]);
  NSObject *audio = [NSClassFromString(@"RoqiaAudio") new];
  NSString *hash = [@"a" stringByPaddingToLength:64 withString:@"a" startingAtIndex:0];
  XCTestExpectation *clip = [self expectationWithDescription:@"Native bounded verse export"];
  [audio verseAudio:target.path
      expectedHash:hash
      startMs:1000
      endMs:2500
      resolve:^(NSString *path) {
        XCTAssertNotEqualObjects(path, target.path);
        XCTAssertTrue([NSFileManager.defaultManager fileExistsAtPath:path]);
        AVURLAsset *asset = [AVURLAsset URLAssetWithURL:[NSURL fileURLWithPath:path] options:nil];
        [asset
            loadValuesAsynchronouslyForKeys:@[ @"duration" ]
                          completionHandler:^{
                            XCTAssertEqualWithAccuracy(CMTimeGetSeconds(asset.duration), 1.5, 0.1);
                            [audio verseAudio:target.path
                                expectedHash:hash
                                startMs:1000
                                endMs:2500
                                resolve:^(NSString *cached) {
                                  XCTAssertEqualObjects(path, cached);
                                  [NSFileManager.defaultManager removeItemAtPath:path error:nil];
                                  [clip fulfill];
                                }
                                reject:^(NSString *code, NSString *message, NSError *error) {
                                  XCTFail(@"Cached clip: %@ %@", code, message);
                                  [clip fulfill];
                                }];
                          }];
      }
      reject:^(NSString *code, NSString *message, NSError *error) {
        XCTFail(@"Clip: %@ %@", code, message);
        [clip fulfill];
      }];
  [self waitForExpectations:@[ clip ] timeout:20];
}

- (void)testNativeVerseClipRejectsUnsafePathsAndOutOfRecordingRanges {
  NSURL *source = [[NSBundle bundleForClass:self.class] URLForResource:@"roqia-01"
                                                         withExtension:@"mp3"];
  NSURL *target = [self.directory URLByAppendingPathComponent:@"clip-invalid.mp3"];
  XCTAssertTrue([NSFileManager.defaultManager copyItemAtURL:source toURL:target error:nil]);
  NSObject *audio = [NSClassFromString(@"RoqiaAudio") new];
  NSString *hash = [@"a" stringByPaddingToLength:64 withString:@"a" startingAtIndex:0];
  for (NSArray *range in @[ @[ @-1, @500 ], @[ @1000, @1000 ], @[ @1000, @99999999 ] ]) {
    XCTestExpectation *rejected = [self expectationWithDescription:@"Invalid clip rejected"];
    [audio verseAudio:target.path
        expectedHash:hash
        startMs:[range[0] doubleValue]
        endMs:[range[1] doubleValue]
        resolve:^(id value) {
          XCTFail(@"Accepted invalid clip");
          [rejected fulfill];
        }
        reject:^(NSString *code, NSString *message, NSError *error) {
          [rejected fulfill];
        }];
    [self waitForExpectations:@[ rejected ] timeout:10];
  }
  XCTestExpectation *unsafe = [self expectationWithDescription:@"Unsafe audio path rejected"];
  [audio verseAudio:@"/etc/hosts"
      expectedHash:hash
      startMs:0
      endMs:500
      resolve:^(id value) {
        XCTFail(@"Accepted unsafe path");
        [unsafe fulfill];
      }
      reject:^(NSString *code, NSString *message, NSError *error) {
        [unsafe fulfill];
      }];
  [self waitForExpectations:@[ unsafe ] timeout:10];
}

- (void)testHafsFontAlreadyBundledWithTheApp {
  NSURL *source = [NSBundle.mainBundle URLForResource:@"NotoSansArabic" withExtension:@"ttf"];
  NSURL *target = [self.directory URLByAppendingPathComponent:@"hafs-font.ttf"];
  XCTAssertNotNil(source);
  XCTAssertTrue([NSFileManager.defaultManager copyItemAtURL:source toURL:target error:nil]);
  for (NSInteger attempt = 0; attempt < 2; attempt++) {
    __block NSString *family;
    [self.reader loadFont:target.path
        expectedHash:@"ee489b994b3e62def9874c918145e32b133b625abaf98cec60502bdb40102c56"
        verses:@[ @"بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ" ]
        resolve:^(id value) {
          family = value;
        }
        reject:^(NSString *code, NSString *message, NSError *error) {
          XCTFail(@"Hafs font: %@ %@", code, message);
        }];
    XCTAssertGreaterThan(family.length, 0);
  }
}

- (void)testRejectsWrongSourceHash {
  [self copySource];
  __block BOOL rejected = NO;
  [self.reader extractSource:[self path:@"original"]
      size:[[self asset:@"original"][@"bytes"] integerValue]
      hash:[@"0" stringByPaddingToLength:64 withString:@"0" startingAtIndex:0]
      members:@[]
      resolve:^(id value) {
        XCTFail(@"Accepted corrupt source");
      }
      reject:^(NSString *code, NSString *message, NSError *error) {
        rejected = YES;
      }];
  XCTAssertTrue(rejected);
}

- (void)testRejectsPathsOutsidePrivateContent {
  __block BOOL rejected = NO;
  [self.reader loadFont:@"/etc/hosts"
      expectedHash:[self asset:@"source-font"][@"sha256"]
      verses:@[ @"بسم الله" ]
      resolve:^(id value) {
        XCTFail(@"Accepted path outside private content");
      }
      reject:^(NSString *code, NSString *message, NSError *error) {
        rejected = YES;
      }];
  XCTAssertTrue(rejected);
}

@end
