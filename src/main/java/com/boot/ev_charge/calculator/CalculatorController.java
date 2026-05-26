package com.boot.ev_charge.calculator;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class CalculatorController {

    @GetMapping("/calculator")
    public String calculator() {
        return "calculator/calculator";
    }
}