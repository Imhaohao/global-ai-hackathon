import { Asset } from 'expo-asset';
import * as BrowserPicker from 'expo-image-picker';
import { Camera, ImageSquare, X } from 'phosphor-react-native';
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '../src/components/Button';
import { Muted, SectionHeading } from '../src/components/Typography';
import { CONTROL_FOCUS_STYLE, useControlFocus } from '../src/components/useControlFocus';
import { usePhotoRequest, type PhotoRequest, type PickedPhoto } from './photoRequest';
import { SAMPLE_CONDITIONS, type SampleCondition } from './sampleLeaves';

const BROWSER_PICKER_OPTIONS: BrowserPicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };

async function pickWithBrowser(request: PhotoRequest): Promise<PickedPhoto | null> {
  const result = request.source === 'camera'
    ? await BrowserPicker.launchCameraAsync(BROWSER_PICKER_OPTIONS)
    : await BrowserPicker.launchImageLibraryAsync(BROWSER_PICKER_OPTIONS);
  if (result.canceled) return null;
  const [asset] = result.assets;
  return { uri: asset.uri, width: asset.width, height: asset.height };
}

const THUMBNAIL_SIZE = { width: 112, height: 56 };

function samplePhoto(image: number): PickedPhoto {
  const asset = Asset.fromModule(image);
  return { uri: asset.uri, width: asset.width ?? 512, height: asset.height ?? 256 };
}

type SampleRowProps = { condition: SampleCondition; nextIndex: number; onChoose: () => void };

function SampleRow({ condition, nextIndex, onChoose }: SampleRowProps) {
  const focus = useControlFocus();
  const image = condition.images[nextIndex % condition.images.length];
  const photoNumber = (nextIndex % condition.images.length) + 1;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Add a ${condition.label} sample leaf`}
      onPress={onChoose}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={focus.isFocused ? CONTROL_FOCUS_STYLE : undefined}
      className="flex-row items-center gap-4 rounded-control bg-surface p-2 shadow-sm active:bg-hairline"
    >
      <Image source={image} resizeMode="cover" style={THUMBNAIL_SIZE} className="rounded-xl" />
      <View className="flex-1">
        <Text className="text-base font-semibold text-ink">{condition.label}</Text>
        <Text className="text-sm text-ink-muted">Photo {photoNumber} of {condition.images.length}</Text>
      </View>
    </Pressable>
  );
}

export function PhotoSheet() {
  const request = usePhotoRequest();
  const [picksByCondition, setPicksByCondition] = useState<Record<string, number>>({});
  if (!request) return null;

  const chooseSample = (condition: SampleCondition) => {
    const index = picksByCondition[condition.key] ?? 0;
    setPicksByCondition({ ...picksByCondition, [condition.key]: index + 1 });
    request.settle(samplePhoto(condition.images[index % condition.images.length]));
  };

  const ownPhotoLabel = request.source === 'camera' ? 'Take a photo with this device' : 'Choose a photo from this device';

  return (
    <View className="absolute inset-0 justify-end bg-ink/50">
      <Pressable accessibilityLabel="Close photo picker" className="flex-1" onPress={() => request.settle(null)} />
      <View accessibilityViewIsModal className="max-h-[85%] rounded-t-card bg-paper pt-5 shadow-lg">
        <ScrollView contentContainerClassName="gap-4 px-5 pb-6">
          <View className="gap-1">
            <SectionHeading>Add a sample leaf</SectionHeading>
            <Muted>Add three leaves of one kind to get advice. Each tap adds a different photo.</Muted>
          </View>
          <View className="gap-3">
            {SAMPLE_CONDITIONS.map((condition) => (
              <SampleRow
                key={condition.key}
                condition={condition}
                nextIndex={picksByCondition[condition.key] ?? 0}
                onChoose={() => chooseSample(condition)}
              />
            ))}
          </View>
          <Button
            label={ownPhotoLabel}
            icon={request.source === 'camera' ? Camera : ImageSquare}
            variant="secondary"
            onPress={() => request.settle(pickWithBrowser(request))}
          />
          <Button label="Cancel" icon={X} variant="quiet" onPress={() => request.settle(null)} />
        </ScrollView>
      </View>
    </View>
  );
}
