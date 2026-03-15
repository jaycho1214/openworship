import {
  getFrameIdForType,
  defaultFrameSettings,
  FrameSettings,
} from '../../shared/types/frame';

describe('getFrameIdForType', () => {
  const settings: FrameSettings = {
    songFrameId: 'frame-song',
    bibleFrameId: 'frame-bible',
    announcementFrameId: 'frame-announce',
  };

  it('returns songFrameId for song type', () => {
    expect(getFrameIdForType(settings, 'song')).toBe('frame-song');
  });

  it('returns bibleFrameId for bible type', () => {
    expect(getFrameIdForType(settings, 'bible')).toBe('frame-bible');
  });

  it('returns announcementFrameId for announcement type', () => {
    expect(getFrameIdForType(settings, 'announcement')).toBe('frame-announce');
  });

  it('returns null when frame ID is null', () => {
    const nullSettings: FrameSettings = {
      songFrameId: null,
      bibleFrameId: null,
      announcementFrameId: null,
    };
    expect(getFrameIdForType(nullSettings, 'song')).toBeNull();
    expect(getFrameIdForType(nullSettings, 'bible')).toBeNull();
    expect(getFrameIdForType(nullSettings, 'announcement')).toBeNull();
  });
});

describe('defaultFrameSettings', () => {
  it('has all null frame IDs', () => {
    expect(defaultFrameSettings.songFrameId).toBeNull();
    expect(defaultFrameSettings.bibleFrameId).toBeNull();
    expect(defaultFrameSettings.announcementFrameId).toBeNull();
  });
});
