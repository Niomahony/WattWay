import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
//import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MapScreen from "../components/MapScreen";
import NavigationScreen from "../components/NavigationScreen";
import { RootStackParamList } from "../navigation/NavigationTypes";

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="MapScreen">
        <Stack.Screen name="MapScreen" component={MapScreen} />
        <Stack.Screen name="NavigationScreen" component={NavigationScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
