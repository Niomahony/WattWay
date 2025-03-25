import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
//import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MapScreen from "../components/MapScreen";
import NavigationScreen from "../components/NavigationScreen";
import { RootStackParamList } from "../navigation/NavigationTypes";
import { PaperProvider } from "react-native-paper";

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <PaperProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="MapScreen"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="MapScreen" component={MapScreen} />
          <Stack.Screen name="NavigationScreen" component={NavigationScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
