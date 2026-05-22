import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="LoginScreen"
        component={LoginScreen}
        options={{ title: 'Login' }}
      />
      <Stack.Screen
        name="SignupScreen"
        component={SignupScreen}
        options={{ title: 'Sign up' }}
      />
    </Stack.Navigator>
  );
}
