package store.pjcloud.cowrite.core.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import store.pjcloud.cowrite.core.common.ProjectScopedCrudController;
import store.pjcloud.cowrite.core.entity.Character;
import store.pjcloud.cowrite.core.service.CharactersService;

@RestController
@RequestMapping("/characters")
public class CharactersController extends ProjectScopedCrudController<Character> {
    public CharactersController(CharactersService service) {
        super(service);
    }
}
