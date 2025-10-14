//
//  Item.swift
//  AI-Proj-iOS
//
//  Created by JohnQiu on 2025/10/14.
//

import Foundation
import SwiftData

@Model
final class Item {
    var timestamp: Date
    
    init(timestamp: Date) {
        self.timestamp = timestamp
    }
}
