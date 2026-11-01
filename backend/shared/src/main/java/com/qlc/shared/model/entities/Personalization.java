package com.qlc.shared.model.entities;

import com.qlc.shared.model.enums.PersonalizationType;

import lombok.AllArgsConstructor;

@AllArgsConstructor 
public class Personalization {
    private final PersonalizationType type;
    private final String contentType;
    private final byte[] contentData;

    public String getContentType() {
        return contentType;
    }

    public byte[] getContentData() {
        return contentData;
    }
}
