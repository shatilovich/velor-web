//
//  MenuView.swift
//  Velor
//
//  Created by Shatilovich.R on 12.12.2025.
//

import SwiftUI

struct MenuView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var systemColorScheme
    
    @Binding var warnPercent: Double
    @Binding var appTheme: String
    
    let getLimitSeconds: (Zone) -> Int
    let setLimitMinutes: (Zone, Int) -> Void
    
    @State private var limitsMinutes: [Zone: Int] = [:]
    @State private var confirmResetDefaults = false
    
    private var effectiveColorScheme: ColorScheme {
        switch appTheme {
        case "light": return .light
        case "dark": return .dark
        default: return systemColorScheme
        }
    }
    
    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Лимиты по зонам")) {
                    ForEach(Zone.allCases) { zone in
                        Stepper(
                            value: Binding(
                                get: { limitsMinutes[zone] ?? max(1, getLimitSeconds(zone) / 60) },
                                set: { newValue in
                                    Haptics.tap()
                                    limitsMinutes[zone] = newValue
                                    setLimitMinutes(zone, newValue)
                                }
                            ),
                            in: 1...30
                        ) {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(zone.title.replacingOccurrences(of: "\n", with: " "))
                                    Text(zone.subtitle)
                                        .font(.footnote)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                Text("\((limitsMinutes[zone] ?? max(1, getLimitSeconds(zone) / 60))) мин")
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
                
                Section(header: Text("Предупреждение")) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Оранжевый порог")
                        Slider(value: $warnPercent, in: 0.6...0.9, step: 0.05)
                        Text("Оранжевый при ~\(Int(warnPercent * 100))% лимита")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
                
                Section(header: Text("Тема")) {
                    Picker("Оформление", selection: $appTheme) {
                        Text("Системная").tag("system")
                        Text("Светлая").tag("light")
                        Text("Тёмная").tag("dark")
                    }
                    .pickerStyle(.segmented)
                    .onChange(of: appTheme) { _, _ in
                        Haptics.tap()
                    }
                }
                
                Section {
                    Button(role: .destructive) {
                        Haptics.resetTap()
                        confirmResetDefaults = true
                    } label: {
                        Text("Сбросить настройки")
                    }
                } footer: {
                    Text("Вернём лимиты зон и порог предупреждения к значениям по умолчанию.")
                }
            }
            .navigationTitle("Меню")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .automatic) {
                    Button("Готово") { dismiss() }
                }
            }
            .alert("Сбросить настройки?", isPresented: $confirmResetDefaults) {
                Button("Отменить", role: .cancel) {}
                Button("Сбросить", role: .destructive) {
                    Haptics.resetTap()
                    for z in Zone.allCases {
                        UserDefaults.standard.removeObject(forKey: z.limitKey)
                    }
                    warnPercent = 0.8
                    
                    for z in Zone.allCases {
                        limitsMinutes[z] = max(1, getLimitSeconds(z) / 60)
                    }
                }
            } message: {
                Text("Все лимиты и пороги вернутся к значениям по умолчанию.")
            }
        }
        .preferredColorScheme(appTheme == "system" ? nil : effectiveColorScheme)
        .onAppear {
            for z in Zone.allCases {
                limitsMinutes[z] = max(1, getLimitSeconds(z) / 60)
            }
            warnPercent = min(max(warnPercent, 0.6), 0.9)
        }
    }
}
