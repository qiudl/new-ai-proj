package com.aiproj.mobile.data.models

import com.google.gson.annotations.SerializedName

data class CreateRequirementDTO(
    @SerializedName("project_id")
    val projectId: Int,

    val title: String,

    val description: String?,

    val priority: RequirementPriority = RequirementPriority.MEDIUM,

    val category: RequirementCategory = RequirementCategory.FEATURE,

    @SerializedName("acceptance_criteria")
    val acceptanceCriteria: String?
)

data class UpdateRequirementDTO(
    val title: String?,

    val description: String?,

    val priority: RequirementPriority?,

    val category: RequirementCategory?,

    @SerializedName("acceptance_criteria")
    val acceptanceCriteria: String?
)
