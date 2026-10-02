import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ArchiveScreen from '../screens/ArchiveScreen'; // Ми перейменуємо файл

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name="Archive"
                component={ArchiveScreen}
                options={{
                    title: 'Мій Архів',
                    headerTitleAlign: 'center'
                }}
            />
        </Stack.Navigator>
    );
}