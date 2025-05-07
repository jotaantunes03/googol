package search;

import java.io.Serializable;

// Classe DTO para resultados formatados
public class SearchResult implements Serializable {
    private String url;
    private String title;
    private String snippet;


    public SearchResult(String url, String title, String snippet) {
        this.url = url;
        this.title = title;
        this.snippet = snippet;
    }

    // Getters
    public String getTitle() { return title; }
    public String getUrl() { return url; }
    public String getSnippet() { return snippet; }

    // Setters (opcional)
    public void setTitle(String title) { this.title = title; }
    public void setUrl(String url) { this.url = url; }
    public void setSnippet(String snippet) { this.snippet = snippet; }


    @Override
    public String toString() {
        return "SearchResult{" +
                "url='" + url + '\'' +
                ", titulo='" + title + '\'' +
                ", citacao='" + snippet + '\'' +
                '}';
    }
}
