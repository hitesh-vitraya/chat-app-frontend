import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HeaderLogoutButton from '../components/HeaderLogoutButton';
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';
import NewChatScreen from '../screens/NewChatScreen';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerRight: () => <HeaderLogoutButton />
};

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="ChatListScreen"
        component={ChatListScreen}
        options={{
          title: 'Chats'
        }}
      />
      <Stack.Screen
        name="ChatScreen"
        component={ChatScreen}
        options={{
          title: 'Chat',
          headerRight: () => null
        }}
      />
      <Stack.Screen
        name="NewChatScreen"
        component={NewChatScreen}
        options={{ title: 'New chat' }}
      />
    </Stack.Navigator>
  );
}
