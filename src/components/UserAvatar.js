import { Image, StyleSheet, Text, View } from 'react-native';
import theme from '../constants/theme';

const getInitial = (name) => (
  (typeof name === 'string' ? name.trim().charAt(0) : '') || '?'
).toUpperCase();

export default function UserAvatar({ name, uri, online, size = 48 }) {
  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2
  };
  const indicatorSize = Math.max(12, Math.round(size * 0.25));

  return (
    <View style={[styles.wrap, avatarStyle]}>
      {uri ? (
        <Image source={{ uri }} style={[styles.avatar, avatarStyle]} />
      ) : (
        <View style={[styles.avatar, styles.fallback, avatarStyle]}>
          <Text style={[styles.initial, { fontSize: Math.round(size * 0.34) }]}>
            {getInitial(name)}
          </Text>
        </View>
      )}
      {online ? (
        <View
          style={[
            styles.indicator,
            {
              width: indicatorSize,
              height: indicatorSize,
              borderRadius: indicatorSize / 2
            }
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative'
  },
  avatar: {
    backgroundColor: theme.colors.border
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary
  },
  initial: {
    color: theme.colors.surface,
    fontWeight: '700'
  },
  indicator: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: theme.colors.surface,
    backgroundColor: theme.colors.success
  }
});
