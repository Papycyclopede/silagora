// components/SimulationControlPanel.tsx
// Ce fichier est maintenant vide car le composant a été retiré de l'application.

// import React from 'react';
// import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
// import { Play, Pause } from 'lucide-react-native';

// interface SimulationControlPanelProps {
//   isSimulationActive: boolean;
//   onToggleSimulation: () => void;
// }

// export default function SimulationControlPanel({
//   isSimulationActive,
//   onToggleSimulation,
// }: SimulationControlPanelProps) {

//   return (
//     <View style={styles.container}>
//       <TouchableOpacity
//         style={[styles.mainButton, isSimulationActive && styles.activeButton]}
//         onPress={onToggleSimulation}
//       >
//         {isSimulationActive ? <Pause size={18} color="#4D3B2F" /> : <Play size={18} color="#4D3B2F" />}
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     gap: 12,
//     alignItems: 'center',
//   },
//   mainButton: {
//     width: 48,
//     height: 48,
//     borderRadius: 12,
//     backgroundColor: 'rgba(252, 230, 236, 0.8)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: 'rgba(139, 125, 107, 0.15)',
//   },
//   activeButton: {
//     backgroundColor: 'rgba(168, 200, 225, 0.8)',
//     borderColor: 'rgba(168, 200, 225, 0.9)',
//   },
// });
