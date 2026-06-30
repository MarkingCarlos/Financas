package com.example.back.exception;

public class GoogleOnlyAccountException extends RuntimeException {
    public GoogleOnlyAccountException() {
        super("Esta conta foi criada com Google. Use o botão 'Entrar com Google' para acessar.");
    }
}
