//
//  Ring.swift
//  Velor
//
//  Created by Shatilovich.R on 12.12.2025.
//

import SwiftUI

struct Ring: View {
    let progress: Double
    let stroke: Color
    
    var body: some View {
        ZStack {
            Circle()
                .stroke(AppColors.ringTrackStroke(), lineWidth: AppColors.ringLineWidth)
            Circle()
                .trim(from: 0, to: progress)
                .stroke(stroke, style: StrokeStyle(lineWidth: AppColors.ringLineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }
        .animation(.easeOut(duration: 0.2), value: progress)
    }
}
