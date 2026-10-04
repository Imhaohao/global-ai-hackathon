import { remapProps } from 'nativewind';
import { SectionList } from 'react-native';

// NativeWind maps class props for ScrollView and FlatList but not SectionList.
remapProps(SectionList, { className: 'style', contentContainerClassName: 'contentContainerStyle' });
