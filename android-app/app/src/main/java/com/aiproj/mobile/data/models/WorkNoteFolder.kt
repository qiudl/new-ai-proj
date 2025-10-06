package com.aiproj.mobile.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class WorkNoteFolder(
    @SerialName("id") val id: Int,
    @SerialName("name") val name: String,
    @SerialName("description") val description: String? = null,
    @SerialName("parent_id") val parentId: Int? = null,
    @SerialName("owner_id") val ownerId: Int,
    @SerialName("project_id") val projectId: Int? = null,
    @SerialName("visibility") val visibility: WorkNoteVisibility,
    @SerialName("color") val color: String? = null,
    @SerialName("icon") val icon: String? = null,
    @SerialName("sort_order") val sortOrder: Int = 0,
    @SerialName("notes_count") val notesCount: Int = 0,
    @SerialName("subfolders_count") val subfoldersCount: Int = 0,
    @SerialName("path") val path: String? = null,
    @SerialName("owner_name") val ownerName: String? = null,
    @SerialName("children") val children: List<WorkNoteFolder>? = null,
    @SerialName("created_at") val createdAt: String,
    @SerialName("updated_at") val updatedAt: String
)
