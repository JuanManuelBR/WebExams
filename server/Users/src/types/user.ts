
export interface add_user_dto {
  primer_nombre: string;
  segundo_nombre: string;
  primer_apellido: string;
  segundo_apellido: string;
  email: string;
  contrasena: string;
}

export interface edit_user_dto{

  primer_nombre?: string;
  segundo_nombre?: string;
  primer_apellido?: string;
  segundo_apellido?: string;
  contrasena?: string;
  confirmar_nueva_contrasena?: string;
}
