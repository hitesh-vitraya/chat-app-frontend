import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HeaderLogoutButton from '../components/HeaderLogoutButton';
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ChatListScreen"
        component={ChatListScreen}
        options={{
          title: 'Chats',
          headerRight: () => <HeaderLogoutButton />
        }}
      />
      <Stack.Screen
        name="ChatScreen"
        component={ChatScreen}
        options={{ title: 'Chat' }}
      />
    </Stack.Navigator>
  );
}
