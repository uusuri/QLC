package com.qlc.models.dtos;

import java.util.List;

public record CourseLanguageDTO(boolean multilingual, List<String> availableLanguages, String selectedLanguage) {}
