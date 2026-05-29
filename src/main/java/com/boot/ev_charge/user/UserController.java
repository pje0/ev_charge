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
    public String loginForm(Model model) {
        model.addAttribute("evModels", vehicleService.getAllEvModels());
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
        if (email != null && email.trim().isEmpty()) {
            email = null;
        }
        user.setEmail(email);
        user.setPhone(phone);

        boolean result = userService.signup(user);
        System.out.println("회원가입 후 user.getId(): " + user.getId());
        
        if (result) {
        	// 차량 선택했으면 등록
            if (modelId != null) {

                System.out.println("선택한 modelId: " + modelId);

                com.boot.ev_charge.vehicle.VehicleDto vehicle =
                        new com.boot.ev_charge.vehicle.VehicleDto();

                vehicle.setUserId(user.getId());
                vehicle.setModelId(modelId);

                System.out.println("vehicle userId: " + vehicle.getUserId());
                System.out.println("vehicle modelId: " + vehicle.getModelId());

                vehicleService.registerVehicle(vehicle);

                System.out.println("차량 등록 호출 완료");
            }

            model.addAttribute("message", "회원가입 완료");

        } else {
            model.addAttribute("error", "중복된 계정");
        }
        model.addAttribute("evModels", vehicleService.getAllEvModels());

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