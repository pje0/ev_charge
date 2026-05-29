package com.boot.ev_charge.user;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping("/login")
    public String loginForm() {
        return "user/login";
    }

    @PostMapping("/signup")
    public String signup(
            @RequestParam("loginId") String loginId,
            @RequestParam("password") String password,
            @RequestParam("name") String name,
            @RequestParam(value = "email", required = false) String email,
            @RequestParam(value = "phone", required = false) String phone,
            @RequestParam(value = "modelId", required = false) Long modelId,
            Model model) {

        UserDto user = new UserDto();
        user.setLoginId(loginId);
        user.setPassword(password);
        user.setName(name);
        user.setEmail(email);
        user.setPhone(phone);

        boolean result = userService.signup(user);

        if (result) {
            // 차량 선택했으면 등록
            if (modelId != null) {
                com.boot.ev_charge.vehicle.VehicleDto vehicle = new com.boot.ev_charge.vehicle.VehicleDto();
                vehicle.setUserId(user.getId());
                vehicle.setModelId(modelId);
                vehicleService.registerVehicle(vehicle);
            }
            model.addAttribute("message", "회원가입 완료");
        } else {
            model.addAttribute("error", "중복된 계정");
        }

        return "user/login";
    }
    
    @Autowired
    private com.boot.ev_charge.vehicle.VehicleService vehicleService;

    @GetMapping("/signup")
    public String signupForm(Model model) {
        model.addAttribute("evModels", vehicleService.getAllEvModels());
        return "user/login";
    }
}