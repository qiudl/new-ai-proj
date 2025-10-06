package com.aiproj.mobile.ui.document.viewer

import io.noties.prism4j.GrammarLocator
import io.noties.prism4j.Prism4j
import io.noties.prism4j.annotations.PrismBundle
import io.noties.prism4j.languages.*

/**
 * 代码语法识别器
 * 支持常见编程语言的语法高亮
 *
 * 支持的语言:
 * - Kotlin, Java, JavaScript
 * - Python, C
 * - JSON
 * - Markdown, HTML
 */
@PrismBundle(
    include = [
        "kotlin", "java", "javascript",
        "python", "c",
        "json", "markdown"
    ],
    grammarLocatorClassName = ".Prism4jGrammarLocatorImpl"
)
class Prism4jGrammarLocator private constructor() : GrammarLocator {

    private val cache = mutableMapOf<String, Prism4j.Grammar?>()

    override fun grammar(prism4j: Prism4j, language: String): Prism4j.Grammar? {
        val realName = getRealLanguageName(language)

        return cache.getOrPut(realName) {
            when (realName) {
                "c" -> Prism_c.create(prism4j)
                "clike" -> Prism_clike.create(prism4j)
                "java" -> Prism_java.create(prism4j)
                "javascript" -> Prism_javascript.create(prism4j)
                "json" -> Prism_json.create(prism4j)
                "kotlin" -> Prism_kotlin.create(prism4j)
                "markdown" -> Prism_markdown.create(prism4j)
                "markup" -> Prism_markup.create(prism4j)
                "python" -> Prism_python.create(prism4j)
                else -> null
            }
        }
    }

    override fun languages(): Set<String> {
        return setOf(
            "c", "clike", "java", "javascript",
            "json", "kotlin", "markdown",
            "markup", "python"
        )
    }

    private fun getRealLanguageName(name: String): String {
        return when (name) {
            "js" -> "javascript"
            "jsonp" -> "json"
            "xml", "html", "mathml", "svg" -> "markup"
            else -> name
        }
    }

    companion object {
        fun create(): GrammarLocator = Prism4jGrammarLocator()
    }
}
