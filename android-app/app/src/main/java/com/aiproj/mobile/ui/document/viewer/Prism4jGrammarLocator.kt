package com.aiproj.mobile.ui.document.viewer

import io.noties.prism4j.GrammarLocator
import io.noties.prism4j.Prism4j
import io.noties.prism4j.annotations.PrismBundle

/**
 * 代码语法识别器
 * 支持常见编程语言的语法高亮
 *
 * 支持的语言:
 * - Kotlin, Java, JavaScript
 * - Python, C
 * - JSON
 * - Markdown, HTML
 *
 * 注意: 这个类使用 @PrismBundle 注解，会自动生成 Prism4jGrammarLocatorImpl
 * 实际使用时请使用生成的实现类
 */
@PrismBundle(
    include = [
        "kotlin", "java", "javascript",
        "python", "c",
        "json", "markdown"
    ],
    grammarLocatorClassName = ".Prism4jGrammarLocatorImpl"
)
class Prism4jGrammarLocator
